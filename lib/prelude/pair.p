def Pair = \(a b : *). fix (self @ PairAB : *). {P : PairAB -> *} -> ((x : a) -> (y : b) -> P (\{P} f. f x y)) -> P self
def MkPair : {a b : *} -> a -> b -> Pair a b = \{a b} x y. \{P} f. f x y

def indPair : {a b : *} -> {P : Pair a b -> *} -> ((x : a) -> (y : b) -> P (MkPair {a} {b} x y)) -> (x : Pair a b) -> P x = \{a b} {P} f x. x {P} f
def casePair : {a b : *} -> {t : *} -> Pair a b -> (a -> b -> t) -> t = \{a b} {t} x f. indPair {a} {b} {\_. t} f x

def fstPair : {a b : *} -> Pair a b -> a = \{a b} p. casePair {a} {b} {a} p \x y. x
def sndPair : {a b : *} -> Pair a b -> b = \{a b} p. casePair {a} {b} {b} p \x y. y
