def Void = {t : *} -> t

def indVoid : {P : Void -> *} -> (x : Void) -> P x
  = \{P} x. x {P x}
