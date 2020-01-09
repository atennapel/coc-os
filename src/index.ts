console.log(42);

/**
TODO:
- solve meta with types
- improve type inference, n-ary
- importing in files

constant time mendler out:

value:
\f. f \x y. y
type:
{f : * -> *} -> ({x : *} -> ({r : *} -> (r -> x) -> f r -> x) -> x) -> f ({x : *} -> ({r : *} -> (r -> x) -> f r -> x) -> x)
*/
