def Void : * = {-t : *} -> t

def caseVoid
  : {-t : *} -> Void -> t
  = \{t} x. x {t}

def indVoid
  : {-P : Void -> *} -> (x : Void) -> P x
  = \{P} x. x {P x}
