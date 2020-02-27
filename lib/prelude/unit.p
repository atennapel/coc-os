import lib/prelude/eq.p

def UnitType = fix (self @ UnitType : *). {P : UnitType -> *} -> P (\{_} x. x) -> P self
def Unit : UnitType = \{_} x. x

def indUnit : {P : UnitType -> *} -> P Unit -> (x : UnitType) -> P x = \{P} p x. x {P} p

def uniqUnit
  : (x : UnitType) -> Eq UnitType x Unit
  = \x. indUnit {\x. Eq UnitType x Unit} (refl {UnitType} {Unit}) x
