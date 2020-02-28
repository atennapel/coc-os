import lib/prelude/fix.p
import lib/prelude/unit.p
import lib/prelude/sum.p
import lib/prelude/pair.p

def ListF = \(t r : *). Sum UnitType (Pair t r) 
def List = \(t : *). Fix (ListF t)

def Nil : {t : *} -> List t = \{t}. In {ListF t} (L {UnitType} {Pair t (List t)} Unit)
def Cons : {t : *} -> t -> List t -> List t
  = \{t} hd tl. In {ListF t} (R {UnitType} {Pair t (List t)} (MkPair {t} {List t} hd tl))

def caseList : {t r : *} -> List t -> r -> (t -> List t -> r) -> r
  = \{t r} l n c. caseSum {UnitType} {Pair t (List t)} {r} (case {ListF t} l) (\_. n) (\p. casePair {t} {List t} {r} p c)
def foldList : {t r : *} -> List t -> r -> (t -> r -> r) -> r
  = \{t r} l n c. fold {ListF t} {r} (\rec k. caseSum {UnitType} {Pair t (List t)} {r} k (\_. n) (\p. casePair {t} {List t} {r} p (\hd tl. c hd (rec tl)))) l

def map : {a b : *} -> (a -> b) -> List a -> List b
  = \{a b} f l. foldList {a} {List b} l (Nil {b}) (\hd tl. Cons {b} (f hd) tl) 
