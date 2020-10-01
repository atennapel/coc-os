import lib/type.p
import lib/unit.p

def Desc : Type = %Desc
def Ret : Desc = %Ret
def Rec : Desc -> Desc = %Rec
def Arg : {T : Type} -> (T -> Desc) -> Desc = \{T} f. %Arg T f

def indDesc
  : {P : Desc -> Type}
    -> P Ret
    -> ((r : Desc) -> P r -> P (Rec r))
    -> ((T : Type) -> (f : T -> Desc) -> ((x : T) -> P (f x)) -> P (Arg {T} f))
    -> (d : Desc)
    -> P d
  = \{P} ret rec arg d. %elimDesc P ret rec arg d

def cataDesc
  : {t : Type}
    -> Desc
    -> t
    -> (Desc -> t -> t)
    -> ((T : Type) -> (T -> Desc) -> (T -> t) -> t)
    -> t
  = \{t} d ret rec arg. indDesc {\_. t} ret rec arg d

def interpretDesc
  : Desc -> Type -> Type
  = \d R. cataDesc d U (\_ r. R ** r) (\T _ f. (x : T) ** f x)

def FixD : (Desc -> Type -> Type) -> Desc -> Type = %FixD
def ConD : (interpret : Desc -> Type -> Type) -> (d : Desc) -> interpret d (FixD interpret d) -> FixD interpret d = %ConD

def elimFixD
  : {interpret : Desc -> Type -> Type}
    -> {d : Desc}
    -> {P : FixD interpret d -> Type}
    -> ((y : interpret d (FixD interpret d)) -> P (ConD interpret d y))
    -> (x : FixD interpret d)
    -> P x
  = \{interpret} {d} {P} h x. %elimFixD interpret d P h x

def Fix : Desc -> Type = FixD interpretDesc
def Con : (d : Desc) -> interpretDesc d (Fix d) -> Fix d = ConD interpretDesc

def elimFix
  : {d : Desc}
    -> {P : Fix d -> Type}
    -> ((y : interpretDesc d (Fix d)) -> P (Con d y))
    -> (x : Fix d)
    -> P x
  = elimFixD {interpretDesc}

def All
  : (D : Desc) -> (X : Type) -> (P : X -> Type) -> interpretDesc D X -> Type
  = \D X P. indDesc {\D. interpretDesc D X -> Type}
    (\_. U)
    (\r h p. P p.fst ** h p.snd)
    (\T f rec p. rec p.fst p.snd)
    D

def all
  : (D : Desc) -> (X : Type) -> (P : X -> Type) -> ((x : X) -> P x) -> (xs : interpretDesc D X) -> All D X P xs
  = \D X P p. indDesc {\D. (xs : interpretDesc D X) -> All D X P xs}
    (\_. ())
    (\r h pp. (p pp.fst, h pp.snd))
    (\T f rec pp. rec pp.fst pp.snd)
    D
