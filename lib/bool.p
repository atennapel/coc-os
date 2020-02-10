def Bool = {t : *} -> t -> t -> t

def True : Bool = \true false. true
def False : Bool = \true false. false

def if : {t : *} -> Bool -> t -> t -> t = \b. b

def not : Bool -> Bool = \b. b False True
def and : Bool -> Bool -> Bool = \a b. a b False
def or : Bool -> Bool -> Bool = \a b. a True b

def indBool
  : {P : Bool -> *} -> (b : Bool) -> P True -> P False -> P b
  = \{P} b t f. b {P b} (assert t) (assert f)
