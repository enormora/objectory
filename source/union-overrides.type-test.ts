import { describe, expect, test } from 'tstyche';
import { createFactory, createUnionFactory } from './main.ts';

type Draft = {
    readonly id: string;
    readonly title: string;
    readonly state: 'draft';
    readonly editorNote: string;
};

type Published = {
    readonly id: string;
    readonly title: string;
    readonly state: 'published';
    readonly publishedAt: string;
};

type Blog = { readonly slug: string; readonly article: Draft | Published; };

const draftFactory = createFactory<Draft>(function () {
    return { id: 'a-1', title: 'Draft', state: 'draft', editorNote: '' };
});

const publishedFactory = createFactory<Published>(function () {
    return { id: 'a-1', title: 'Draft', state: 'published', publishedAt: '2026-01-01' };
});

const articleFactory = createUnionFactory([ draftFactory, publishedFactory ]);

const blogFactory = createFactory<Blog>(function () {
    return { slug: 'a-blog', article: articleFactory };
});

describe('overrides accepted by a union factory', function () {
    test('accepts an override of a property every variant has', function () {
        expect(articleFactory.build).type.toBeCallableWith({ title: 'Renamed' });
    });

    test('accepts an override of a property only the default variant has', function () {
        expect(articleFactory.build).type.toBeCallableWith({ editorNote: 'reviewed' });
    });

    test('accepts a switch that names the discriminator', function () {
        expect(articleFactory.build).type.toBeCallableWith({ state: 'published', publishedAt: 'now' });
        expect(articleFactory.build).type.toBeCallableWith({ state: 'published' });
    });

    test('accepts a switch combined with an override of a shared property', function () {
        expect(articleFactory.build).type.toBeCallableWith({ state: 'published', title: 'Renamed' });
    });

    test('rejects an override mixing keys of two variants', function () {
        expect(articleFactory.build).type.not.toBeCallableWith({ state: 'draft', publishedAt: 'now' });
    });

    test('rejects an override carrying only a key of another variant', function () {
        expect(articleFactory.build).type.not.toBeCallableWith({ publishedAt: 'now' });
    });

    test('rejects a discriminator value that names no variant', function () {
        expect(articleFactory.build).type.not.toBeCallableWith({ state: 'archived' });
    });
});

describe('overrides accepted by a nested union factory', function () {
    test('accepts an override of a property every variant has', function () {
        expect(blogFactory.build).type.toBeCallableWith({ article: { title: 'Renamed' } });
    });

    test('accepts a switch that names the discriminator', function () {
        expect(blogFactory.build).type.toBeCallableWith({ article: { state: 'published', publishedAt: 'now' } });
    });

    test('rejects an override mixing keys of two variants', function () {
        expect(blogFactory.build).type.not.toBeCallableWith({ article: { state: 'draft', publishedAt: 'now' } });
    });

    test('rejects a discriminator value that names no variant', function () {
        expect(blogFactory.build).type.not.toBeCallableWith({ article: { state: 'archived' } });
    });

    test('rejects an override carrying only a key of another variant', function () {
        expect(blogFactory.build).type.not.toBeCallableWith({ article: { publishedAt: 'now' } });
    });

    test('rejects a variant-exclusive key without the discriminator', function () {
        expect(blogFactory.build).type.not.toBeCallableWith({ article: { editorNote: 'reviewed' } });
    });

    test('accepts a variant-exclusive key when the discriminator comes along', function () {
        expect(blogFactory.build).type.toBeCallableWith({ article: { state: 'draft', editorNote: 'reviewed' } });
    });

    test('accepts a switch that names only the discriminator', function () {
        expect(blogFactory.build).type.toBeCallableWith({ article: { state: 'published' } });
    });
});
