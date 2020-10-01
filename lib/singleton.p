import lib/type.p
import lib/eq.p

def Sing : {t : Type} -> t -> Type = \{t} x. (y : t) ** (Eq x y)
def MkSing : {t : Type} -> (x : t) -> Sing {t} x = \{t} x. (x, Refl)
def unSing: {t : Type} -> {x : t} -> Sing {t} x -> t = \s. s.fst
