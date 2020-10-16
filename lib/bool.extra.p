import lib/bool.p
import lib/eq.p
import lib/unit.p
import lib/void.p

def liftBool : Bool -> * = \b. if b U Void

def trueNeqFalse
  : Neq {Bool} True False
  = \eq. rewrite {Bool} {liftBool} eq (() : liftBool True)
