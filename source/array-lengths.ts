/* eslint-disable @stylistic/indent -- conflicts with dprint */
type LengthOptions = {
    readonly length?: number;
};

type OptionsWithLength<Length extends number> = {
    readonly length: Length;
};

export type LengthForOptions<Options extends LengthOptions> = Options extends
    OptionsWithLength<infer Length extends number> ? Length : 0;

type MaxElementTupleLength = 64;

type LongerElementTuple<Element, Length extends number, Accumulated extends readonly Element[]> =
    Accumulated['length'] extends MaxElementTupleLength ? readonly Element[]
        : ElementTuple<Element, Length, readonly [...Accumulated, Element]>;

type ElementTuple<Element, Length extends number, Accumulated extends readonly Element[] = readonly []> =
    Accumulated['length'] extends Length ? Accumulated : LongerElementTuple<Element, Length, Accumulated>;

type BoundedElementTuple<Element, Options extends LengthOptions> = ElementTuple<Element, LengthForOptions<Options>>;

export type ElementsForOptions<Element, Options extends LengthOptions> = number extends LengthForOptions<Options>
    ? readonly Element[]
    : BoundedElementTuple<Element, Options>;
