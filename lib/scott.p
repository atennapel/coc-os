def Nat = fix (Nat : *). {t : *} -> t -> (Nat -> t) -> t
def Z : Nat = roll \z s. z
def S : Nat -> Nat = \n. roll \z s. s n

def pred : Nat -> Nat = \n. unroll n Z (\x. x)

-- below is an attempt to define a recursor for Scott numerals
def NatRZ = \(x : *). {z : *} -> {s : *} -> z -> s -> Nat -> x
def NatRS = \(x : *). {z : *} -> {s : *} -> (z -> s -> z -> s -> Nat -> x) -> z -> s -> Nat -> x
def NatR = {x : *} -> NatRZ x -> NatRS x -> NatRZ x -> NatRS x -> Nat -> x

def ZR : NatR = \z1 s1 z2 s2 m. z1 z2 s2 m
def SR : NatR -> NatR = \n z1 s1 z2 s2 m. s1 n z2 s2 m

def recNatBase : {x : *} -> x -> NatRZ x = \x z s n. x
def recNatStep : {x : *} -> x -> (Nat -> x -> x) -> NatRS x
  = \x f n z s m. let p = pred m in f p (n z s z s p)

-- natToNatR does not work currently, but is key in making the recursor work
-- technically NatR is an eta-expansion of Nat but because of fix
-- this does not work nicely and there will be normalization errors
def natToNatR : Nat -> NatR = \n. n

def recNat : {x : *} -> x -> (Nat -> x -> x) -> Nat -> x
  = \{x} z s n. (natToNatR n) {x} (recNatBase z) (recNatStep z s) (recNatBase z) (recNatStep z s) n

def add : Nat -> Nat -> Nat = \m n. recNat n (\_ x. S x) m
