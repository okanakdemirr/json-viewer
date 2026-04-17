import { describe, it, expect } from 'vitest';
import { previewFor, dedupeAndInsert } from '../history.js';

describe('previewFor', () => {
    it('builds JSON preview with size and unique key', () => {
        const r = previewFor('json', { content: '{"a":1}' });
        expect(r.size).toBe(7);
        expect(r.preview).toBe('{"a":1}');
        expect(r.uniqueKey).toBe('{"a":1}');
    });
    it('collapses whitespace in JSON preview', () => {
        const r = previewFor('json', { content: '{\n  "a":\t1\n}' });
        expect(r.preview).toBe('{ "a": 1 }');
    });
    it('builds compare preview with combined unique key', () => {
        const r = previewFor('compare', { original: 'abc', modified: 'abd' });
        expect(r.uniqueKey).toBe('abc|abd');
        expect(r.size).toBe(6);
        expect(r.preview).toMatch(/^Compare: abc\.\.\. vs abd\.\.\./);
    });
});

describe('dedupeAndInsert', () => {
    it('prepends a new entry', () => {
        const entries = [];
        const entry = { type: 'json', data: { content: 'a' } };
        dedupeAndInsert(entries, entry, 'json', 'a', 10);
        expect(entries).toEqual([entry]);
    });

    it('removes the existing match before inserting', () => {
        const older = { id: 1, type: 'json', data: { content: 'x' } };
        const other = { id: 2, type: 'json', data: { content: 'y' } };
        const entries = [older, other];
        const newEntry = { id: 3, type: 'json', data: { content: 'x' } };
        dedupeAndInsert(entries, newEntry, 'json', 'x', 10);
        expect(entries[0]).toBe(newEntry);
        expect(entries.filter((e) => e.data.content === 'x')).toHaveLength(1);
        expect(entries).toHaveLength(2);
    });

    it('dedupes compare entries by combined key', () => {
        const older = { type: 'compare', data: { original: 'a', modified: 'b' } };
        const entries = [older];
        const newEntry = { type: 'compare', data: { original: 'a', modified: 'b' } };
        dedupeAndInsert(entries, newEntry, 'compare', 'a|b', 10);
        expect(entries).toHaveLength(1);
        expect(entries[0]).toBe(newEntry);
    });

    it('does not dedupe across different types', () => {
        const jsonEntry = { type: 'json', data: { content: 'a' } };
        const compareEntry = { type: 'compare', data: { original: 'a', modified: '' } };
        const entries = [jsonEntry];
        dedupeAndInsert(entries, compareEntry, 'compare', 'a|', 10);
        expect(entries).toHaveLength(2);
        expect(entries[0]).toBe(compareEntry);
    });

    it('trims to max length', () => {
        const entries = [
            { type: 'json', data: { content: 'c' } },
            { type: 'json', data: { content: 'b' } },
            { type: 'json', data: { content: 'a' } },
        ];
        const newEntry = { type: 'json', data: { content: 'd' } };
        dedupeAndInsert(entries, newEntry, 'json', 'd', 3);
        expect(entries).toHaveLength(3);
        expect(entries[0].data.content).toBe('d');
        expect(entries.map((e) => e.data.content)).not.toContain('a');
    });
});
