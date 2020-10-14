import lib/idesc.p
import lib/generic.p
import lib/fin.p

def SumCurriedHyps
  : {I : *}
    -> {n : Nat}
    -> (C : Fin n -> IDesc I)
    -> (P : (i : I) -> IData (IArg {I} {Fin n} C) i -> *)
    -> (a : Fin n)
    -> *
  = \{I} {n} C P a.
    let D = IArg {I} {Fin n} C in
    CurriedHyps (C a) (IData D) P (\xs. ICon {I} {D} (a, xs))

def elimUncurried
  : {-I : *}
    -> {n : Nat}
    -> (C : Fin n -> IDesc I)
    -> (
      let D = IArg {I} {Fin n} C in
      {-P : (i : I) -> IData D i -> *}
      -> Branches n (SumCurriedHyps {I} {n} C P)
      -> {-i : I}
      -> (x : IData D i)
      -> P i x
    )
  = \{I} {n} C {P} b {i} x.
      let D = IArg {I} {Fin n} C in
      indCurried D P (\f. dcase {n} {SumCurriedHyps {I} {n} C P} f b) i x

def elim
  : {I : *}
  -> {n : Nat}
  -> (C : Fin n -> IDesc I)
  -> (
    let D = IArg {I} {Fin n} C in
    {P : (i : I) -> IData D i -> *}
    -> CurriedBranches n (SumCurriedHyps {I} {n} C P) ({-i : I} -> (x : IData D i) -> P i x)
  )
  = \{I} {n} C {P}.
    let D = IArg {I} {Fin n} C in
    curryBranches {n} {SumCurriedHyps {I} {n} C P} {{-i : I} -> (x : IData D i) -> P i x} (elimUncurried {I} {n} C {P})

def TaggedIDesc 
  : * -> *
  = \I. (n : Nat) ** Branches n (\_. IDesc I) 

def tagged
  : {n : Nat} -> {-I : *} -> Branches n (\_. IDesc I) -> TaggedIDesc I
  = \{n} {I} b. (n, b)

def untag
  : {-I : *} -> TaggedIDesc I -> IDesc I
  = \{I} t. IArg {I} {Fin t.fst} (\f. case {t.fst} f t.snd)

def untagC
  : {-I : *} -> (t : TaggedIDesc I) -> Fin t.fst -> IDesc I
  = \{I} t f. case {t.fst} f t.snd

def TaggedIData : {I : *} -> TaggedIDesc I -> I -> * = \{I} C. IData {I} (untag C)

def injTagged : {-I : *} -> (D : TaggedIDesc I) -> CurriedEl (untag D) (TaggedIData D) = \{I} D. inj {I} (untag D)

def elimTagged
  : {I : *}
  -> (C : TaggedIDesc I)
  -> (
    let D = untag C in
    {P : (i : I) -> IData D i -> *}
    -> CurriedBranches C.fst (SumCurriedHyps {I} {C.fst} (untagC C) P) ({-i : I} -> (x : IData D i) -> P i x)
  )
  = \{I} C {P}. elim {I} {C.fst} (untagC C) {P}
