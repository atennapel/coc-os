def Bool = {t : *} -> t -> t -> t

def True : Bool = \{t : *} (true : t) (false : t). true
def False : Bool = \{t : *} (true : t) (false : t). false

def if : {t : *} -> Bool -> t -> t -> t = \{t : *} (b : Bool). b {t}
