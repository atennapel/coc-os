def Fix = \(f : * -> *). fix (r : *). {x : *} -> ((r -> x) -> f r -> x) -> x

def fold : {f : * -> *} -> {x : *} -> ((Fix f -> x) -> f (Fix f) -> x) -> Fix f -> x
  = \{f} {x} alg r. (unroll r) {x} alg
def inF : {f : * -> *} -> f (Fix f) -> Fix f
  = \{f} x. roll (Fix f) \{t} alg. alg (fold {f} {t} alg) x
def outF : {f : * -> *} -> Fix f -> f (Fix f)
  = \{f} x. (unroll x) {f (Fix f)} (\_ x. x)

def NatF = \(r : *). {t : *} -> t -> (r -> t) -> t
def Nat = Fix NatF
def Z : Nat = inF {NatF} \{t} z s. z
def S : Nat -> Nat = \n. inF {NatF} \{t} z s. s n

def caseNat : {t : *} -> Nat -> t -> (Nat -> t) -> t
  = \{t} n z s. outF {NatF} n {t} z s
def recNat : {t : *} -> Nat -> t -> ((Nat -> t) -> Nat -> t) -> t
  = \{t} n z s. fold {NatF} {t} (\rec m. m {t} z (\k. s rec k)) n

def foldNat : {t : *} -> Nat -> t -> (t -> t) -> t
  = \{t} n z s. recNat {t} n z (\rec m. s (rec m))

def pred : Nat -> Nat = \n. caseNat {Nat} n Z (\n. n)

def add : Nat -> Nat -> Nat = \n m. foldNat {Nat} n m S
def mul : Nat -> Nat -> Nat = \n m. foldNat {Nat} n Z (add m)
def pow : Nat -> Nat -> Nat = \n m. foldNat {Nat} m (S Z) (mul n)

def sub : Nat -> Nat -> Nat = \n m. foldNat {Nat} m n pred
