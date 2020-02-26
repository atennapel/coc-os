def Sum = \(a b : *). fix (SumAB : *). {P : SumAB -> *} -> ((x : a) -> P (\f g. f x)) -> ((x : b) -> P (\f g. g x)) -> P self
