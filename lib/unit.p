import lib/eq.p

def UnitType = {t : *} -> t -> t

def Unit : UnitType = \x. x

def indUnit
  : {P : UnitType -> *} -> (x : UnitType) -> P Unit -> P x
  = \{P} x. induction {UnitType} x {P}

def uniqUnit
  : (x : UnitType) -> Eq UnitType x Unit
  = \x. indUnit {\x. Eq UnitType x Unit} x (refl {UnitType} {Unit})
