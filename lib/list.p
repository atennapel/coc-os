import lib/type.p
import lib/desc.p
import lib/bool.p

def ListD : Type -> Desc = \t. SumD Ret (Arg {t} \_. Rec Ret)
def List : Type -> Type = \t. Fix (ListD t)
def Nil : {t : Type} -> List t = \{t}. Con {ListD t} (True, ())
def Cons : {t : Type} -> t -> List t -> List t = \{t} hd tl. Con {ListD t} (False, hd, tl, ())
