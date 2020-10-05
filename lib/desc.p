import lib/unit.p
import lib/bool.p

def Desc : * = %Desc
def Ret : Desc = %Ret
def Rec : Desc -> Desc = %Rec
def Arg : {T : *} -> (T -> Desc) -> Desc = \{T} f. %Arg T f

def indDesc
  : {P : Desc -> *}
    -> P Ret
    -> ((r : Desc) -> P r -> P (Rec r))
    -> ((T : *) -> (f : T -> Desc) -> ((x : T) -> P (f x)) -> P (Arg {T} f))
    -> (d : Desc)
    -> P d
  = \{P} ret rec arg d. %elimDesc P ret rec arg d

def cataDesc
  : {t : *}
    -> Desc
    -> t
    -> (Desc -> t -> t)
    -> ((T : *) -> (T -> Desc) -> (T -> t) -> t)
    -> t
  = \{t} d ret rec arg. indDesc {\_. t} ret rec arg d

def interpretDesc
  : Desc -> * -> *
  = \d R. cataDesc d U (\_ r. R ** r) (\T _ f. (x : T) ** f x)

def All
  : (D : Desc) -> (X : *) -> (P : X -> *) -> interpretDesc D X -> *
  = \D X P. indDesc {\D. interpretDesc D X -> *}
    (\_. U)
    (\r h p. P p.fst ** h p.snd)
    (\T f rec p. rec p.fst p.snd)
    D

def all
  : (D : Desc) -> (X : *) -> (P : X -> *) -> ((x : X) -> P x) -> (xs : interpretDesc D X) -> All D X P xs
  = \D X P p. indDesc {\D. (xs : interpretDesc D X) -> All D X P xs}
    (\_. ())
    (\r h pp. (p pp.fst, h pp.snd))
    (\T f rec pp. rec pp.fst pp.snd)
    D

def DescInterpretPackage : * =
  (interpret : Desc -> * -> *)
  **
  (All : (D : Desc) -> (X : *) -> (P : X -> *) -> interpret D X -> *)
  **
  ((D : Desc) -> (X : *) -> (P : X -> *) -> ((x : X) -> P x) -> (xs : interpret D X) -> All D X P xs)

def FixD : DescInterpretPackage -> Desc -> * = %FixD
def ConD : (p : DescInterpretPackage) -> (d : Desc) -> p.fst d (FixD p d) -> FixD p d = %ConD

def elimFixD
  : (p : DescInterpretPackage)
    -> (D : Desc)
    -> (P : FixD p D -> *)
    -> ((d : p.interpret D (FixD p D)) -> p.All D (FixD p D) P d -> P (ConD p D d))
    -> (x : FixD p D)
    -> P x
  = \p D P h x. %elimFixD p D P h x

def descInterpretPackage : DescInterpretPackage = (interpretDesc, All, all)

def Fix : Desc -> * = FixD descInterpretPackage
def Con : {d : Desc} -> interpretDesc d (Fix d) -> Fix d = \{d}. ConD descInterpretPackage d

def elimFix
  : {D : Desc}
    -> {P : Fix D -> *}
    -> ((d : interpretDesc D (Fix D)) -> All D (Fix D) P d -> P (Con {D} d))
    -> (x : Fix D)
    -> P x
  = \{d} {P}. elimFixD descInterpretPackage d P

def SumD : Desc -> Desc -> Desc = \a b. Arg \c. if c a b
