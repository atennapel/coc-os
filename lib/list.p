import lib/desc.p
import lib/bool.p
import lib/generic.p

def ListD : * -> Desc = \t. SumD End (Arg {t} \_. Rec End)
def List : * -> * = \t. Data (ListD t)
def Nil : {t : *} -> List t = \{t}. inj (ListD t) True
def Cons : {t : *} -> t -> List t -> List t = \{t}. inj (ListD t) False
