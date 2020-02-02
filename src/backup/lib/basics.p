def opaque UnitType = {t : *} -> t -> t
def opaque Unit : UnitType = open UnitType in \x. x

def opaque Void = {t : *} -> t
def void : {t : *} -> Void -> t = \{t} v. open Void in v {t}

def opaque Pair = \(a b : *). {t : *} -> (a -> b -> t) -> t
def casePair : {a b : *} -> {t : *} -> Pair a b -> (a -> b -> t) -> t = \p. open Pair in p
def P : {a b : *} -> a -> b -> Pair a b = \a b. open Pair in \p. p a b
def fst : {a b : *} -> Pair a b -> a = \p. casePair p \a b. a
def snd : {a b : *} -> Pair a b -> b = \p. casePair p \a b. b

def opaque Sum = \(a b : *). {t : *} -> (a -> t) -> (b -> t) -> t
def caseSum : {a b : *} -> {t : *} -> Sum a b -> (a -> t) -> (b -> t) -> t = \s. open Sum in s
def L : {a b : *} -> a -> Sum a b = \x. open Sum in \f g. f x
def R : {a b : *} -> b -> Sum a b = \x. open Sum in \f g. g x
