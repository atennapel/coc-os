def UnitType = fix (UnitType : *). {P : UnitType -> *} -> P (\{_} x. x) -> P self
def Unit : UnitType = \{_} x. x

def indUnit : {P : UnitType -> *} -> P Unit -> (x : UnitType) -> P x = \{P} p x. x {P} p
