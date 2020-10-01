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

def Fix : Desc -> Type = FixD interpretDesc
def Con : (d : Desc) -> interpretDesc d (Fix d) -> Fix d = ConD interpretDesc
