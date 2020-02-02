def List = \(t : *). {r : *} -> r -> (t -> r -> r) -> r

def Nil : {t : *} -> List t = \{t : *} {r : *} (hd : r) (tl : t -> r -> r). hd
def Cons
  : {t : *} -> t -> List t -> List t
  = \{t : *} (hdx : t) (tlx : List t) {r : *} (hd : r) (tl : t -> r -> r). tl hdx (tlx {t} hd tl)
