def UnitType = {t : *} -> t -> t

def Unit : UnitType = \x. x

def indUnit : {P : UnitType -> *} -> (x : UnitType) -> P Unit -> P x
  = \{P} x pu. assert pu
