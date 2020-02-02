def Bool = {t : *} -> t -> t -> t

def True : Bool = \{t : *} (true : t) (false : t). true
def False : Bool = \{t : *} (true : t) (false : t). false

def if : {t : *} -> Bool -> t -> t -> t = \{t : *} (b : Bool). b {t}

def not : Bool -> Bool = \(b : Bool). b {Bool} False True
def and : Bool -> Bool -> Bool = \(a : Bool) (b : Bool). a {Bool} b False
def or : Bool -> Bool -> Bool = \(a : Bool) (b : Bool). a {Bool} True b
