import lib/eq.p

def Sing : {t : *} -> t -> * = \{t} x. (y : t) ** (Eq x y)
def MkSing : {t : *} -> (x : t) -> Sing {t} x = \{t} x. (x, Refl)
def unSing: {t : *} -> {x : t} -> Sing {t} x -> t = \s. s.fst
