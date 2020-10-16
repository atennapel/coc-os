import lib/bool.p

def IDesc : * -> * = %IDesc
def IEnd : {-I : *} -> (-i : I) -> IDesc I = \{I} i. %IEnd I i
def IArg : {-I -A : *} -> (A -> IDesc I) -> IDesc I = \{I} {A} f. %IArg I A f
def IArgE : {-I -A : *} -> ((-a : A) -> IDesc I) -> IDesc I = \{I} {A} f. %IArgE I A f
def IFArg : {-I : *} -> (-A : *) -> IDesc I -> IDesc I = \{I} A d. %IFArg I A d
def IRec : {-I : *} -> (-i : I) -> IDesc I -> IDesc I = \{I} i d. %IRec I i d
def IHRec : {-I -A : *} -> (-fi : A -> I) -> IDesc I -> IDesc I = \{I} {A} fi d. %IHRec I A fi d
def ISumD : {-I : *} -> IDesc I -> IDesc I -> IDesc I = \{I} a b. IArg {I} {Bool} \c. if c a b

def indIDesc
  : {-I : *}
    -> {-P : IDesc I -> *}
    -> ((-i : I) -> P (IEnd {I} i))
    -> ((-A : *) -> (f : A -> IDesc I) -> ((a : A) -> P (f a)) -> P (IArg {I} {A} f))
    -> ((-A : *) -> (f : (-a : A) -> IDesc I) -> ((-a : A) -> P (f a)) -> P (IArgE {I} {A} f))
    -> ((-A : *) -> (d : IDesc I) -> P d -> P (IFArg {I} A d))
    -> ((-i : I) -> (d : IDesc I) -> P d -> P (IRec {I} i d))
    -> ((-A : *) -> (-f : A -> I) -> (d : IDesc I) -> P d -> P (IHRec {I} {A} f d))
    -> (d : IDesc I)
    -> P d
  = \{I} {P}. %elimIDesc I P

def InterpI : {I : *} -> IDesc I -> (I -> *) -> I -> * = \{I}. %InterpI I
def AllIDesc : (I : *) -> (d : IDesc I) -> (X : I -> *) -> ((i : I) -> X i -> *) -> (i : I) -> (xs : InterpI {I} d X i) -> * = %AllI
def allIDesc
  : {-I : *} -> (d : IDesc I) -> (-X : I -> *) -> (-P : (i : I) -> X i -> *) -> ((-i : I) -> (x : X i) -> P i x) -> (-i : I) -> (xs : InterpI {I} d X i) -> AllIDesc I d X P i xs
  = \{I}. %allI I

def IData : {I : *} -> IDesc I -> I -> * = \{I}. %IData I
def ICon : {-I : *} -> {-d : IDesc I} -> {-i : I} -> InterpI {I} d (IData {I} d) i -> IData {I} d i = \{I} {d} {i} x. %ICon I d i x
def indI
  : {-I : *}
    -> {d : IDesc I}
    -> {-P : (i : I) -> IData {I} d i -> *}
    -> (
      {-i : I}
      -> (y : InterpI {I} d (IData {I} d) i)
      -> AllIDesc I d (IData {I} d) P i y
      -> P i (ICon {I} {d} {i} y)
    )
    -> {-i : I}
    -> (x : IData {I} d i)
    -> P i x
  = \{I} {d} {P} h {i} x. %indI I d P (\i. h {i}) i x
