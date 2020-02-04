; mendler-style recursion, using a fixpoint type
def Fix = \(f : * -> *). fix (r : *). {x : *} -> ((r -> x) -> f r -> x) -> x

def fold : {f : * -> *} -> {x : *} -> ((Fix f -> x) -> f (Fix f) -> x) -> Fix f -> x
  = \{f} {x} alg r. unroll r {x} alg
def inF : {f : * -> *} -> f (Fix f) -> Fix f
  = \{f} x. roll (Fix f) \{t} alg. alg (fold {f} {t} alg) x
def outF : {f : * -> *} -> Fix f -> f (Fix f)
  = \{f} x. unroll x {f (Fix f)} (\_ x. x)

; nats
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

; binary nats
def BNatF = \(r : *). {t : *} -> t -> (r -> t) -> (r -> t) -> t
def BNat = Fix BNatF
def BE : BNat = inF {BNatF} \{t} e z o. e
def B0 : BNat -> BNat = \n. inF {BNatF} \{t} e z o. z n
def B1 : BNat -> BNat = \n. inF {BNatF} \{t} e z o. o n

def caseBNat : {t : *} -> BNat -> t -> (BNat -> t) -> (BNat -> t) -> t
  = \{t} n e z o. outF {BNatF} n {t} e z o
def recBNat : {t : *} -> BNat -> t -> ((BNat -> t) -> BNat -> t) -> ((BNat -> t) -> BNat -> t) -> t
  = \{t} n e z o. fold {BNatF} {t} (\rec m. m {t} e (\k. z rec k) (\k. o rec k)) n

def foldBNat : {t : *} -> BNat -> t -> (t -> t) -> (t -> t) -> t
  = \{t} n e z o. recBNat {t} n e (\rec m. z (rec m)) (\rec m. o (rec m))
