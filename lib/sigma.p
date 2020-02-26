def Sigma = \(a : *) (b : a -> *). fix (SigmaAB : *). {P : SigmaAB -> *} -> ((x : a) -> (y : b x) -> P (\{P} f. f x y)) -> P self
def MkSigma : {a : *} -> {b : a -> *} -> (x : a) -> b x -> Sigma a b = \{a b} x y. \{P} f. f x y

def indSigma : {a : *} -> {b : a -> *} -> {P : Sigma a b -> *} -> ((x : a) -> (y : b x) -> P (MkSigma {a} {b} x y)) -> (x : Sigma a b) -> P x = \{a b} {P} f x. x {P} f
-- def caseSigma : {a : *} -> {b : a -> *} -> {t : *} -> Sigma a b -> ((x : a) -> b x -> t) -> t = \{a b} {t} x f. indSigma {a} {b} {\_. t} f x

-- def fstSigma : {a : *} -> {b : a -> *} -> Sigma a b -> a = \{a b} p. caseSigma {a} {b} {a} p \x y. x
-- def sndSigma : {a : *} -> {b : a -> *} -> (x : Sigma a b) -> b (fstSigma {a} {b} x) = \{a b} p. caseSigma {a} {b} {fstSigma {a} {b} p} p \x y. y
-- def sndSigma = \{a b} p. indSigma {a} {b} {\s. fstSigma {a} {b} s} (\x y. y) p : {a : *} -> {b : a -> *} -> (x : Sigma a b) -> b (fstSigma {a} {b} x)
