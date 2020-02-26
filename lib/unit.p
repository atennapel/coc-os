def UnitTy = fix (UnitTy : *). {P : UnitTy -> *} -> P (\{P} x. x) -> P self
