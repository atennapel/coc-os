import lib/idesc.p
import lib/desc.p
import lib/generic.p
import lib/fin.p

def -SumCurriedHyps
  : {I : *}
    -> {n : Nat}
    -> (C : Fin n -> IDesc I)
    -> (P : (i : I) -> IData (IArg {I} {Fin n} C) i -> *)
    -> (a : Fin n)
    -> *
  = \{I} {n} C P a.
    let D = IArg {I} {Fin n} C;
    CurriedHyps (C a) (IData D) P (\xs. ICon {I} {D} (a, xs))

def elimUncurriedI
  : {-I : *}
    -> {n : Nat}
    -> (C : Fin n -> IDesc I)
    -> (
      let D = IArg {I} {Fin n} C;
      {-P : (i : I) -> IData D i -> *}
      -> Branches n (SumCurriedHyps {I} {n} C P)
      -> {-i : I}
      -> (x : IData D i)
      -> P i x
    )
  = \{I} {n} C {P} b {i} x.
      let D = IArg {I} {Fin n} C;
      indCurried D P (\f. dcase {n} {SumCurriedHyps {I} {n} C P} f b) i x

def elimI
  : {-I : *}
  -> {n : Nat}
  -> (C : Fin n -> IDesc I)
  -> (
    let D = IArg {I} {Fin n} C;
    {-P : (i : I) -> IData D i -> *}
    -> CurriedBranches n (SumCurriedHyps {I} {n} C P) ({-i : I} -> (x : IData D i) -> P i x)
  )
  = \{I} {n} C {P}.
    let D = IArg {I} {Fin n} C;
    curryBranches {n} {SumCurriedHyps {I} {n} C P} {{-i : I} -> (x : IData D i) -> P i x} (elimUncurriedI {I} {n} C {P})

def elimUncurried
  : {n : Nat}
    -> (C : Fin n -> Desc)
    -> (
      let D = Arg {Fin n} C;
      {-P : Data D -> *}
      -> Branches n (SumCurriedHyps {U} {n} C (\_. P))
      -> (x : Data D)
      -> P x
    )
  = \{n} C {P} b x.
      let D = Arg {Fin n} C;
      indCurried D (\_. P) (\f. dcase {n} {SumCurriedHyps {U} {n} C (\_. P)} f b) () x

def elim
  : {n : Nat}
  -> (C : Fin n -> Desc)
  -> (
    let D = Arg {Fin n} C;
    {-P : Data D -> *}
    -> CurriedBranches n (SumCurriedHyps {U} {n} C (\_. P)) ((x : Data D) -> P x)
  )
  = \{n} C {P}.
    let D = Arg {Fin n} C;
    curryBranches {n} {SumCurriedHyps {U} {n} C (\_. P)} {(x : Data D) -> P x} (elimUncurried {n} C {P})

def TaggedIDesc 
  : * -> *
  = \I. (n : Nat) ** Branches n (\_. IDesc I) 

def taggedI
  : {n : Nat} -> {-I : *} -> Branches n (\_. IDesc I) -> TaggedIDesc I
  = \{n} {I} b. (n, b)

def untagIC
  : {-I : *} -> (t : TaggedIDesc I) -> Fin t.fst -> IDesc I
  = \{I} t f. case {t.fst} f t.snd

def untagI
  : {-I : *} -> TaggedIDesc I -> IDesc I
  = \{I} t. IArg {I} {Fin t.fst} (untagIC {I} t)

def TaggedIData : {I : *} -> TaggedIDesc I -> I -> *
  = \{I} C. IData {I} (untagI C)

def injTaggedI
  : {-I : *} -> (D : TaggedIDesc I) -> CurriedEl (untagI D) (TaggedIData D)
  = \{I} D. inj {I} (untagI D)

def elimTaggedI
  : {-I : *}
  -> (C : TaggedIDesc I)
  -> (
    let D = untagI C;
    {-P : (i : I) -> IData D i -> *}
    -> CurriedBranches C.fst (SumCurriedHyps {I} {C.fst} (untagIC C) P) ({-i : I} -> (x : IData D i) -> P i x)
  )
  = \{I} C {P}. elimI {I} {C.fst} (untagIC C) {P}

def TaggedDesc = (n : Nat) ** Branches n (\_. Desc)
def tagged
  : {n : Nat} -> Branches n (\_. Desc) -> TaggedDesc
  = \{n} b. (n, b)
def untagC
  : (t : TaggedDesc) -> Fin t.fst -> Desc
  = \t f. case {t.fst} f t.snd
def untag
  : TaggedDesc -> Desc
  = \t. Arg {Fin t.fst} (untagC t)
def TaggedData
  : TaggedDesc -> *
  = \C. Data (untag C)
def injTagged
  : (D : TaggedDesc) -> CurriedEl (untag D) (\_. TaggedData D)
  = \D. inj {U} (untag D)
def elimTagged
  : (C : TaggedDesc) -> (
    let D = untag C;
    {-P : Data D -> *}
    -> CurriedBranches C.fst (SumCurriedHyps {U} {C.fst} (untagC C) (\_. P)) ((x : Data D) -> P x)
  )
  = \C {P}. elim {C.fst} (untagC C) {P}
