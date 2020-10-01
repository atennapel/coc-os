import lib/type.p

def Void : Type = (t : Type) -> t

def caseVoid
  : {t : Type} -> Void -> t
  = \{t} x. x t

def indVoid
  : {P : Void -> Type} -> (x : Void) -> P x
  = \{P} x. x (P x)
