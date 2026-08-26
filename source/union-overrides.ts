/* eslint-disable @stylistic/operator-linebreak, @stylistic/indent -- conflicts with dprint */
import type { AllowedObjectShapeValues, Overrides, ShapeToGeneratorReturnValue } from './main.ts';

type AnyShape = Readonly<Record<string, AllowedObjectShapeValues>>;

type AllKeys<Union> = Union extends unknown ? keyof Union : never;

type Forbid<Keys extends PropertyKey> = Readonly<Partial<Record<Keys, never>>>;

type UnionToIntersection<Union> = (Union extends unknown ? (argument: Union) => void : never) extends
    (argument: infer Intersection) => void ? Intersection : never;

export type IsUnion<Candidate, Copy = Candidate> = Candidate extends unknown
    ? ([Copy] extends [Candidate] ? false : true)
    : never;

type OverridesForShape<Shape> = Shape extends AnyShape ? Overrides<ShapeToGeneratorReturnValue<Shape>> : never;

type DiscriminatingKeys<Default, Target> = {
    [Key in keyof Target]-?: Key extends keyof Default ? (Default[Key] extends Target[Key] ? never : Key) : never;
}[keyof Target];

type KeysToOverride<Default, Target> = Exclude<keyof Target, DiscriminatingKeys<Default, Target>>;

type VariantBranch<Union, Default, Target> =
    & Forbid<Exclude<AllKeys<Union>, keyof Target>>
    & OverridesForShape<Pick<Target, KeysToOverride<Default, Target>>>
    & Pick<Target, DiscriminatingKeys<Default, Target> & keyof Target>;

type SharedBranch<Union> =
    & Forbid<Exclude<AllKeys<Union>, keyof Union>>
    & UnionToIntersection<Union extends unknown ? OverridesForShape<Pick<Union, keyof Union>> : never>;

type VariantBranches<Union, Default, Members> = Members extends unknown ? VariantBranch<Union, Default, Members>
    : never;

export type UnionOverride<Union, Default> = SharedBranch<Union> | VariantBranches<Union, Default, Union>;

export type FactoryOverride<ObjectShape, Default> = true extends IsUnion<ObjectShape>
    ? UnionOverride<ObjectShape, Default>
    : Overrides<ShapeToGeneratorReturnValue<Extract<ObjectShape, AnyShape>>>;

export function emptyOverrides<ObjectShape extends AnyShape, DefaultShape extends ObjectShape>(): FactoryOverride<
    ObjectShape,
    DefaultShape
> {
    const noOverrides: unknown = {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- an empty override fits every branch
    return noOverrides as FactoryOverride<ObjectShape, DefaultShape>;
}
