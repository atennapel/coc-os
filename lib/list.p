import lib/desc.p
import lib/bool.p

def ListD : * -> Desc = \t. SumD Ret (Arg {t} \_. Rec Ret)
def List : * -> * = \t. Fix (ListD t)
def Nil : {t : *} -> List t = \{t}. Con {ListD t} (True, ())
def Cons : {t : *} -> t -> List t -> List t = \{t} hd tl. Con {ListD t} (False, hd, tl, ())
