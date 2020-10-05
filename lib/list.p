import lib/desc.p
import lib/bool.p

def ListD : * -> Desc = \t. SumD End (Arg {t} \_. Rec End)
def List : * -> * = \t. Data (ListD t)
def Nil : {t : *} -> List t = \{t}. Con {ListD t} (True, ())
def Cons : {t : *} -> t -> List t -> List t = \{t} hd tl. Con {ListD t} (False, hd, (\_. tl), ())
