import lib/type.p
import lib/unit.p

def Monoid : Type -> Type = \t. (unit : t) ** (append : t -> t -> t) ** U
def mkMonoid
  : {t : Type} -> t -> (t -> t -> t) -> Monoid t
  = \unit append. (unit, append, ())

def unit : {t : Type} -> Monoid t -> t = \m. m.unit
def append : {t : Type} -> Monoid t -> t -> t -> t = \m. m.append

def instanceMonoidFun
  : {t : Type} -> Monoid (t -> t)
  = \{t}. mkMonoid {t -> t} (\x. x) (\f g x. f (g x))
