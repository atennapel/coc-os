import lib/desc.p
import lib/bool.p
import lib/generic.p

def ListD : (-t : *) -> Desc = \t. SumD End (Arg {t} \_. Rec End)
def List : * -> * = \t. Data (ListD t)
def Nil : {-t : *} -> List t = \{t}. inj (ListD t) True
def Cons : {-t : *} -> t -> List t -> List t = \{t}. inj (ListD t) False

def indList
  : {-t : *}
    -> {-P : List t -> *}
    -> P Nil
    -> ((hd : t) -> (tl : List t) -> P tl -> P (Cons hd tl))
    -> (l : List t)
    -> P l
  = \{t} {P} n c l. elimBool (\b. if b End (Arg {t} \_. Rec End)) {P} n c l

def paraList
  : {-t -r : *} -> List t -> r -> (t -> List t -> r -> r) -> r
  = \{t r} l n c. indList {t} {\_. r} n c l
def cataList
  : {-t -r : *} -> List t -> r -> (t -> r -> r) -> r
  = \{t r} l n c. paraList {t} {r} l n (\hd _. c hd)
def caseList
  : {-t -r : *} -> List t -> r -> (t -> List t -> r) -> r
  = \{t r} l n c. paraList {t} {r} l n (\hd tl _. c hd tl)

def mapList
  : {-a -b : *} -> (a -> b) -> List a -> List b
  = \{a} {b} f l. cataList l (Nil {b}) (\hd tl. Cons (f hd) tl)

def appendList
  : {-t : *} -> List t -> List t -> List t
  = \{t} a b. cataList a b (\hd tl. Cons hd tl)
