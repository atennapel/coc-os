def opaque UnitType = {t : *} -> t -> t
def opaque Unit : UnitType = open UnitType in \x. x

def opaque Void = {t : *} -> t
def void : {t : *} -> Void -> t = \{t} v. open Void in v {t}

def opaque Pair = \(a b : *). {t : *} -> (a -> b -> t) -> t
def casePair : {t : *} -> {a b : *} -> Pair a b -> (a -> b -> t) -> t = \p. open Pair in p
def pair : {a b : *} -> a -> b -> Pair a b = \a b. open Pair in \p. p a b
def fst : {a b : *} -> Pair a b -> a = \p. casePair p \a b. a
def snd : {a b : *} -> Pair a b -> b = \p. casePair p \a b. b
