def Void = {t : *} -> t

def indVoid
  : {P : Void -> *} -> (x : Void) -> P x
  = \{P} x. induction {Void} x {P}
