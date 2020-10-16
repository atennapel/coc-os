def Bool : * = %B
def True : Bool = %1
def False : Bool = %0

def indBool
  : {-P : Bool -> *}
    -> P True
    -> P False
    -> (b : Bool) -> P b
  = \{P} t f b. %elimB P f t b

def if
  : {-t : *} -> Bool -> t -> t -> t
  = \{t} c a b. indBool {\_. t} a b c

def not : Bool -> Bool = \b. if b False True
def and : Bool -> Bool -> Bool = \a b. if a b False
def or : Bool -> Bool -> Bool = \a b. if a True b

def eqBool : Bool -> Bool -> Bool = \a b. if a b (not b)
def neqBool : Bool -> Bool -> Bool = \a b. not (eqBool a b)
def xor = neqBool
