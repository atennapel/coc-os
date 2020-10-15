import lib/idesc.p
import lib/bool.p
import lib/nat.p
import lib/generic.p

def FinD : IDesc Nat = ISumD (IArg \n. IEnd (S n)) (IArg \n. IRec n (IEnd (S n)))
def Fin : Nat -> * = IData FinD
def FZ : {n : Nat} -> Fin (S n) = \{n}. inj FinD True n
def FS : {n : Nat} -> Fin n -> Fin (S n) = \{n}. inj FinD False n

def indFin
  : {-P : (n : Nat) -> Fin n -> *}
    -> ((n : Nat) -> P (S n) (FZ {n}))
    -> ((n : Nat) -> (f : Fin n) -> P n f -> P (S n) (FS {n} f))
    -> {-n : Nat}
    -> (x : Fin n)
    -> P n x
  = \{P} z s {n} x. elimIBool {Nat} (\b. if b (IArg \n. IEnd (S n)) (IArg \n. IRec n (IEnd (S n)))) {P} z s {n} x

def dcaseFin
  : {-P : (n : Nat) -> Fin n -> *}
    -> ((n : Nat) -> P (S n) (FZ {n}))
    -> ((n : Nat) -> (f : Fin n) -> P (S n) (FS {n} f))
    -> {-n : Nat}
    -> (x : Fin n)
    -> P n x
  = \{P} z s {n} x. indFin {P} z (\m f _. s m f) {n} x

def paraFin
  : {-t : *}
    -> {-n : Nat}
    -> Fin n
    -> (Nat -> t)
    -> ((m : Nat) -> Fin m -> t -> t)
    -> t
  = \{t} {n} x z s. indFin {\_ _. t} z s {n} x

def cataFin
  : {-t : *}
    -> {-n : Nat}
    -> Fin n
    -> (Nat -> t)
    -> (Nat -> t -> t)
    -> t
  = \{t} {n} x z s. paraFin {t} {n} x z (\n _ r. s n r)

def caseFin
  : {-t : *}
    -> {-n : Nat}
    -> Fin n
    -> (Nat -> t)
    -> ((m : Nat) -> Fin m -> t)
    -> t
  = \{t} {n} x z s. paraFin {t} {n} x z (\n f _. s n f)

def CaseF
  : (n : Nat) -> Fin n -> *
  = \n. dcaseNat {\n. Fin n -> *}
          (\x. (P : Fin 0 -> *) -> P x)
          (\m x. (P : Fin (S m) -> *) -> P FZ -> ((y : Fin m) -> P (FS y)) -> P x)
          n

def caseF
  : (n : Nat) -> (x : Fin n) -> CaseF n x
  = \n x. dcaseFin {CaseF} (\m P HZ HS. HZ) (\m y P HZ HS. HS y) x

def Branches
  : (n : Nat) -> (Fin n -> *) -> *
  = \n. indNat {\n. (Fin n -> *) -> *} (\_. U) (\m r P. P FZ ** r (\f. P (FS f))) n

def caseP
  : {-n : Nat} -> (x : Fin n) -> (-P : Fin n -> *) -> Branches n P -> P x
  = \{n} x. indFin {\n f. (-P : Fin n -> *) -> Branches n P -> P f} (\m P b. b.fst) (\m f r P b. r (\f. P (FS f)) b.snd) x

def dcase
  : {-n : Nat} -> {-P : Fin n -> *} -> (x : Fin n) -> Branches n P -> P x
  = \{n} {P} x b. caseP {n} x P b

def case
  : {-n : Nat} -> {-t : *} -> (x : Fin n) -> Branches n (\_. t) -> t
  = \{n} {t} x b. dcase {n} {\_. t} x b

def UncurriedBranches : (n : Nat) -> (P : Fin n -> *) -> * -> *
  = \n P X. Branches n P -> X

def CurriedBranches : (n : Nat) -> (P : Fin n -> *) -> * -> *
  = \n. indNat {\n. (P : Fin n -> *) -> * -> *} (\P X. X) (\m r P X. P FZ -> r (\f. P (FS f)) X) n

def curryBranchesE
  : (n : Nat) -> (-P : Fin n -> *) -> (-X : *) -> UncurriedBranches n P X -> CurriedBranches n P X
  = \n. indNat {\n. (-P : Fin n -> *) -> (-X : *) -> UncurriedBranches n P X -> CurriedBranches n P X}
      (\P X b. b ())
      (\m r P X b c. r (\f. P (FS f)) X (\cs. b (c, cs)))
      n

def uncurryBranchesE
  : (n : Nat) -> (P : Fin n -> *) -> (X : *) -> CurriedBranches n P X -> UncurriedBranches n P X
  = \n. indNat {\n. (P : Fin n -> *) -> (X : *) -> CurriedBranches n P X -> UncurriedBranches n P X}
      (\P X b _. b)
      (\m r P X b p. r (\f. P (FS f)) X (b p.fst) p.snd)
      n

def curryBranches
  : {n : Nat} -> {-P : Fin n -> *} -> {-X : *} -> UncurriedBranches n P X -> CurriedBranches n P X
  = \{n} {P} {X}. curryBranchesE n P X

def uncurryBranches
  : {n : Nat} -> {P : Fin n -> *} -> {X : *} -> CurriedBranches n P X -> UncurriedBranches n P X
  = \{n} {P} {X}. uncurryBranchesE n P X
