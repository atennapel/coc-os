import lib/eq.p
import lib/void.p

def U : * = Eq Void Void
def Unit : U = Refl

def indUnitE
  : {-P : U -> *} -> P () -> {-u : U} -> P u
  = \{P} p {u}. p

def indUnit
  : {-P : U -> *} -> P () -> (u : U) -> P u
  = \p _. p
