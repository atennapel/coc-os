import lib/type.p
import lib/eq.p
import lib/unit.p
import lib/void.p

def Bool : Type = %B
def True : Bool = %1
def False : Bool = %0

def indBool
  : {P : Bool -> Type}
    -> P True
    -> P False
    -> (b : Bool) -> P b
  = \{P} t f b. %elimB P f t b

def if
  : {t : Type} -> Bool -> t -> t -> t
  = \{t} c a b. indBool {\_. t} a b c

def not : Bool -> Bool = \b. if b False True
def and : Bool -> Bool -> Bool = \a b. if a b False
def or : Bool -> Bool -> Bool = \a b. if a True b

def eqBool : Bool -> Bool -> Bool = \a b. if a b (not b)
def neqBool : Bool -> Bool -> Bool = \a b. not (eqBool a b)
def xor = neqBool

def liftBool : Bool -> Type = \b. if b U Void

def trueNeqFalse
  : Neq {Bool} True False
  = \eq. rewrite {Bool} {liftBool} eq (() : liftBool True)
