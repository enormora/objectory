import { test } from 'node:test';
import assert from 'node:assert';
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

const draftFactory = createFactory<Draft>(function () {
    return { id: 'a-1', title: 'Draft', state: 'draft', editorNote: '' };
});

const publishedFactory = createFactory<Published>(function () {
    return { id: 'a-1', title: 'Draft', state: 'published', publishedAt: '2026-01-01' };
});

const articleFactory = createUnionFactory([ draftFactory, publishedFactory ]);

test('createUnionFactory() builds the first variant by default', function () {
    assert.deepStrictEqual(articleFactory.build(), {
        id: 'a-1',
        title: 'Draft',
        state: 'draft',
        editorNote: ''
    });
});

test('createUnionFactory() merges an override of a common property into the default variant', function () {
    assert.deepStrictEqual(articleFactory.build({ title: 'Renamed' }), {
        id: 'a-1',
        title: 'Renamed',
        state: 'draft',
        editorNote: ''
    });
});

test('createUnionFactory() switches variant when the discriminator names another one', function () {
    assert.deepStrictEqual(articleFactory.build({ state: 'published', publishedAt: 'now' }), {
        id: 'a-1',
        title: 'Draft',
        state: 'published',
        publishedAt: 'now'
    });
});

test('createUnionFactory() leaves no key of the previous variant behind when switching', function () {
    const built = articleFactory.build({ state: 'published', publishedAt: 'now' });

    assert.strictEqual(Object.hasOwn(built, 'editorNote'), false);
});

test('createUnionFactory() fills the target variant defaults when only the discriminator is given', function () {
    assert.deepStrictEqual(articleFactory.build({ state: 'published' }), {
        id: 'a-1',
        title: 'Draft',
        state: 'published',
        publishedAt: '2026-01-01'
    });
});

test('createUnionFactory() keeps a common override while switching variant', function () {
    assert.deepStrictEqual(articleFactory.build({ state: 'published', title: 'Renamed' }), {
        id: 'a-1',
        title: 'Renamed',
        state: 'published',
        publishedAt: '2026-01-01'
    });
});

test('createUnionFactory() throws when no registered variant has the override keys', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass an unknown override key with a type assertion
        return articleFactory.build({ nothingLikeThis: 1 });
    }, { name: 'TypeError', message: /no registered variant matches it/u });
});

test('createUnionFactory() treats a value that names no variant as an ordinary override', function () {
    // A variant switch happens only when the override names a registered variant. Otherwise the key
    // is an ordinary value override, which is what keeps a common key overridable when the variants
    // happen to disagree on its default.
    assert.deepStrictEqual(
        // @ts-expect-error -- consumers can bypass an unregistered variant with a type assertion
        articleFactory.build({ state: 'archived' }),
        { id: 'a-1', title: 'Draft', state: 'archived', editorNote: '' }
    );
});

test('createUnionFactory() supports withOverrides on the union', function () {
    const publishedArticleFactory = articleFactory.withOverrides({ state: 'published' });

    assert.deepStrictEqual(publishedArticleFactory.build(), {
        id: 'a-1',
        title: 'Draft',
        state: 'published',
        publishedAt: '2026-01-01'
    });
});

test('createUnionFactory() supports buildList', function () {
    const [ first, second ] = articleFactory.buildList({ length: 2 });

    assert.deepStrictEqual(first, second);
    assert.notStrictEqual(first, second);
});

test('createUnionFactory() supports the freeze option', function () {
    const article = articleFactory.build({}, { freeze: true });

    assert.strictEqual(Object.isFrozen(article), true);
});

test('createUnionFactory() works as a nested factory', function () {
    const blogFactory = createFactory<{ readonly slug: string; readonly article: Draft | Published; }>(function () {
        return { slug: 'a-blog', article: articleFactory };
    });

    assert.deepStrictEqual(blogFactory.build({ article: { state: 'published' } }), {
        slug: 'a-blog',
        article: { id: 'a-1', title: 'Draft', state: 'published', publishedAt: '2026-01-01' }
    });
});

test('createUnionFactory() leaves no stale key behind when nested', function () {
    const blogFactory = createFactory<{ readonly slug: string; readonly article: Draft | Published; }>(function () {
        return { slug: 'a-blog', article: articleFactory };
    });

    const built = blogFactory.build({ article: { state: 'published' } });

    assert.strictEqual(Object.hasOwn(built.article, 'editorNote'), false);
});

test('createUnionFactory() works as an array factory item', function () {
    const feedFactory = createFactory<{ readonly articles: readonly (Draft | Published)[]; }>(function () {
        return { articles: articleFactory.asArray({ length: 2 }) };
    });

    const built = feedFactory.build({ articles: [ {}, { state: 'published' } ] });

    assert.deepStrictEqual(built.articles, [
        { id: 'a-1', title: 'Draft', state: 'draft', editorNote: '' },
        { id: 'a-1', title: 'Draft', state: 'published', publishedAt: '2026-01-01' }
    ]);
});
