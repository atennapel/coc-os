def Sum = \(a b : *). fix (self @ SumAB : *). {P : SumAB -> *} -> ((x : a) -> P (\f g. f x)) -> ((x : b) -> P (\f g. g x)) -> P self
def L : {a b : *} -> a -> Sum a b = \{a b} x {P} f g. f x
def R : {a b : *} -> b -> Sum a b = \{a b} x {P} f g. g x

def indSum : {a b : *} -> {P : Sum a b -> *} -> ((x : a) -> P (L {a} {b} x)) -> ((x : b) -> P (R {a} {b} x)) -> (x : Sum a b) -> P x = \{a b} {P} l r x. x {P} l r
def caseSum : {a b : *} -> {t : *} -> Sum a b -> (a -> t) -> (b -> t) -> t = \{a b} {t} x l r. indSum {a} {b} {\_. t} l r x
