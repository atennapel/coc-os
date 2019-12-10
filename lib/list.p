; not working at the moment

def opaque List = \(t : *). {r : *} -> r -> (t -> r -> r) -> r

def foldList = \{t : *} {r : *} (l : List t). open List in l {r}

def Nil
  : {t : *} -> List t
  = open List in \nil cons. nil
def Cons
  : {t : *} -> t -> List t -> List t
  = \head tail. open List in \nil cons. cons head (tail nil cons)

def map
  : {a b : *} -> (a -> b) -> List a -> List b
  = \f l. foldList a l Nil (\head tail. Cons (f head) tail)
