import lib/eq.p
import lib/unit.p

def Sing : {-t : *} -> t -> * = \{t} x. (y : t) ** (-p : Eq x y) ** U
def MkSing : {-t : *} -> (x : t) -> Sing {t} x = \{t} x. (x, Refl, ())
def unSing: {-t : *} -> {-x : t} -> Sing {t} x -> t = \s. s.fst
