import lib/type.p
import lib/eq.p
import lib/void.p

def U : Type = Eq Void Void
def Unit : U = Refl

def indUnitE
  : {P : U -> Type} -> P () -> {u : U} -> P u
  = \{P} p {u}. p

def indUnit
  : {P : U -> Type} -> P () -> (u : U) -> P u
  = \p _. p
