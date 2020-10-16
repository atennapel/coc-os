import lib/unit.p
import lib/desc.p
import lib/taggeddesc.p

def ListD : (-t : *) -> TaggedDesc = \t. tagged {2} (
  End,
  FArg t (Rec End),
())
def List : * -> * = \t. TaggedData (ListD t)
def Nil : {-t : *} -> List t = \{t}. injTagged (ListD t) 0f
def Cons : {-t : *} -> t -> List t -> List t = \{t}. injTagged (ListD t) 1f

def indList
  : {-t : *}
    -> {-P : List t -> *}
    -> P Nil
    -> ((hd : t) -> (tl : List t) -> P tl -> P (Cons hd tl))
    -> (l : List t)
    -> P l
  = \{t} {P} n c l. elimTagged (ListD t) {P} n c {()} l

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
