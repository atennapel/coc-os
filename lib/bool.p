def Bool = {t : *} -> t -> t -> t

def True : Bool = \t f. t
def False : Bool = \t f. f

def caseBool : {t : *} -> Bool -> t -> t -> t
  = \b. b

def dcaseBool : {P : Bool -> *} -> (b : Bool) -> P True -> P False -> P b
  = \{P} b t f. b {P b} (unsafeCast (P b) t) (unsafeCast (P b) f)
